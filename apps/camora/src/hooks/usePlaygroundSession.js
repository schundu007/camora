import { useState, useEffect, useRef, useCallback } from 'react';
import { getStoredToken } from '@/utils/tokenStore';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3009';

async function apiFetch(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  });
  return res;
}

export function usePlaygroundSession() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const startTick = useCallback((expiresAt) => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining < 300) {
        console.warn('[Playground] Session expiring in < 5 minutes');
      }
      if (remaining === 0) {
        stopPolling();
        setSession(null);
        setStatus('idle');
      }
    }, 1000);
  }, [stopPolling]);

  const startPolling = useCallback((sessionId, expiresAt) => {
    startTick(expiresAt);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/v1/playground/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.expiresAt) {
          setSession(prev => prev ? { ...prev, ...data } : data);
          startTick(data.expiresAt);
        }
      } catch {
        // ignore poll errors
      }
    }, 5000);
  }, [startTick]);

  const createSession = useCallback(async (environment, scenarioId) => {
    setStatus('creating');
    setError(null);
    try {
      const body = { environment };
      if (scenarioId) body.scenarioId = scenarioId;
      const res = await apiFetch('/api/v1/playground/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setError('Daily session limit reached. Upgrade to Pro for unlimited sessions.');
        } else if (res.status === 403) {
          setError('This environment requires a Pro subscription.');
        } else if (res.status === 503) {
          setError('Playground infrastructure is starting up. Try again in a moment.');
        } else {
          const d = await res.json().catch(() => ({}));
          setError(d.error || d.detail || 'Failed to create session.');
        }
        setStatus('error');
        return;
      }
      const data = await res.json();
      // Browsers cannot set custom headers on WebSocket connections, so pass
      // the JWT as a query param (?token=...) instead of Authorization header.
      const wsBase = API_URL.replace(/^http/, 'ws');
      const wsToken = getStoredToken() || '';
      const sessionWithWs = {
        ...data,
        wsUrl: `${wsBase}/playground/ws/${data.sessionId}?token=${encodeURIComponent(wsToken)}`,
      };
      setSession(sessionWithWs);
      setStatus('ready');
      const remaining = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      startPolling(data.sessionId, data.expiresAt);
    } catch (err) {
      setError(err.message || 'Unexpected error.');
      setStatus('error');
    }
  }, [startPolling]);

  const destroySession = useCallback(async () => {
    if (!session) return;
    stopPolling();
    try {
      await apiFetch(`/api/v1/playground/sessions/${session.sessionId}`, { method: 'DELETE' });
    } catch {
      // best-effort
    }
    setSession(null);
    setStatus('idle');
    setError(null);
    setTimeRemaining(0);
  }, [session, stopPolling]);

  const extendSession = useCallback(async () => {
    if (!session) return;
    try {
      const res = await apiFetch(`/api/v1/playground/sessions/${session.sessionId}/extend`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      setSession(prev => prev ? { ...prev, ...data, extended: true } : data);
      if (data.expiresAt) startTick(data.expiresAt);
    } catch {
      // ignore
    }
  }, [session, startTick]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const extendAvailable = !!session && timeRemaining < 300 && session.extended !== true;

  return {
    session,
    status,
    error,
    timeRemaining,
    extendAvailable,
    canExtend: extendAvailable,
    createSession,
    destroySession,
    extendSession,
  };
}
