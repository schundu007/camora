import { useState, useEffect, useRef, useCallback } from 'react';
import { getStoredToken, subscribeToken } from '@/utils/tokenStore';
import { playgroundSessionStore } from '@/lib/userScopedStorage';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_PLAYGROUND_API_URL || import.meta.env.VITE_CAPRA_API_URL || 'http://localhost:3010';

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

async function savesFetch(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_URL}${endpoint}`, { credentials: 'include', ...options, headers });
}

function saveSession(sessionId, environment, expiresAt) {
  playgroundSessionStore.write({ sessionId, environment, expiresAt });
}

function loadSession() {
  try {
    const data = playgroundSessionStore.read();
    if (!data || !data.sessionId || !data.expiresAt) return null;
    if (new Date(data.expiresAt).getTime() < Date.now()) {
      playgroundSessionStore.clear();
      return null;
    }
    return data;
  } catch { return null; }
}

function clearSession() {
  playgroundSessionStore.clear();
}

export function usePlaygroundSession() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);       // { sessionId, environment, expiresAt }
  const [status, setStatus] = useState('idle');        // idle | creating | booting | ready | error
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [bootSteps, setBootSteps] = useState([]);      // SSE events array
  const [saves, setSaves] = useState([]);
  const [savesLoading, setSavesLoading] = useState(false);
  const [slotsUsed, setSlotsUsed] = useState(0);
  const [slotsMax, setSlotsMax] = useState(0);

  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const sseRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (sseRef.current) { sseRef.current.abort(); sseRef.current = null; }
  }, []);

  const startTick = useCallback((expiresAt) => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining === 0) {
        stopAll();
        clearSession();
        setSession(null);
        setStatus('idle');
        setBootSteps([]);
      }
    }, 1000);
  }, [stopAll]);

  const startPolling = useCallback((sessionId, expiresAt) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/v1/playground/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.expiresAt && mountedRef.current) {
          setSession(prev => prev ? {
            ...prev,
            ...data,
            isCluster: data.isCluster || prev.isCluster || false,
            nodes: data.nodes || prev.nodes || null,
          } : data);
          startTick(data.expiresAt);
          saveSession(sessionId, data.environment, data.expiresAt);
        }
      } catch {}
    }, 30_000);
  }, [startTick]);

  const subscribeBootEvents = useCallback((sessionId, onReady) => {
    // Cancel any previous stream
    if (sseRef.current) { sseRef.current.abort(); sseRef.current = null; }

    const ac = new AbortController();
    sseRef.current = ac;

    const token = getStoredToken() || '';
    const url = `${API_URL}/api/v1/playground/sessions/${sessionId}/events`;

    (async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          credentials: 'include',
          signal: ac.signal,
        });

        if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // SSE messages are separated by double newline
          const parts = buf.split('\n\n');
          buf = parts.pop(); // keep incomplete last chunk

          for (const part of parts) {
            const dataLine = part.split('\n').find(l => l.startsWith('data: '));
            if (!dataLine) continue;
            try {
              const event = JSON.parse(dataLine.slice(6));
              if (!mountedRef.current) return;
              if (event.type === 'ready') {
                ac.abort();
                sseRef.current = null;
                onReady();
                return;
              } else if (event.step) {
                setBootSteps(prev => {
                  const existing = prev.findIndex(s => s.step === event.step);
                  if (existing >= 0) {
                    const next = [...prev];
                    next[existing] = event;
                    return next;
                  }
                  return [...prev, event];
                });
              }
            } catch {}
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        // Fallback: poll session status until ready
        const check = setInterval(async () => {
          try {
            const r = await apiFetch(`/api/v1/playground/sessions/${sessionId}`);
            if (r.ok) {
              const data = await r.json();
              if (data.status === 'ready' || data.status === 'active') {
                clearInterval(check);
                onReady();
              }
            }
          } catch {}
        }, 5000);
        setTimeout(() => clearInterval(check), 3 * 60 * 1000);
      }
    })();
  }, []);

  // Restore session on mount
  useEffect(() => {
    const stored = loadSession();
    if (!stored) return;

    (async () => {
      try {
        const res = await apiFetch(`/api/v1/playground/sessions/${stored.sessionId}`);
        if (!res.ok) { clearSession(); return; }
        const data = await res.json();
        if (!mountedRef.current) return;
        if (data.status === 'ready' || data.status === 'active') {
          const fullSession = {
            ...stored,
            ...data,
            isCluster: data.isCluster || false,
            nodes: data.nodes || null,
          };
          setSession(fullSession);
          setStatus('ready');
          const remaining = Math.max(0, Math.floor((new Date(data.expiresAt || stored.expiresAt).getTime() - Date.now()) / 1000));
          setTimeRemaining(remaining);
          startTick(data.expiresAt || stored.expiresAt);
          startPolling(stored.sessionId, data.expiresAt || stored.expiresAt);
        } else {
          clearSession();
        }
      } catch { clearSession(); }
    })();
  }, [startTick, startPolling]);

  const loadSaves = useCallback(async () => {
    setSavesLoading(true);
    try {
      const res = await savesFetch('/api/v1/playground/saves');
      if (res.ok) {
        const data = await res.json();
        setSaves(data.saves || []);
        setSlotsUsed(data.slots?.used ?? 0);
        setSlotsMax(data.slots?.max ?? 0);
      }
    } catch {}
    setSavesLoading(false);
  }, []);

  useEffect(() => { loadSaves(); }, [loadSaves]);

  // Destroy session if user logs out
  useEffect(() => {
    const unsub = subscribeToken((token) => {
      if (!token && status === 'ready') {
        stopAll();
        clearSession();
        setSession(null);
        setStatus('idle');
        setBootSteps([]);
      }
    });
    return unsub;
  }, [status, stopAll]);

  const createSession = useCallback(async (environment, scenarioId, setupScript) => {
    setStatus('creating');
    setError(null);
    setBootSteps([]);
    try {
      const body = { environment };
      if (scenarioId) body.scenarioId = scenarioId;
      if (setupScript) body.setupScript = setupScript;
      const res = await apiFetch('/api/v1/playground/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (res.status === 429) setError('Daily session limit reached. Upgrade to Pro for unlimited sessions.');
        else if (res.status === 403) setError('This environment requires a Pro subscription.');
        else if (res.status === 503) setError('Playground infrastructure starting up. Try again in a moment.');
        else { const d = await res.json().catch(() => ({})); setError(d.error || 'Failed to create session.'); }
        setStatus('error');
        return;
      }
      const data = await res.json();
      const newSession = {
        sessionId: data.sessionId,
        environment,
        expiresAt: data.expiresAt,
        isCluster: data.isCluster || false,
        nodes: data.nodes || null,
      };
      setSession(newSession);
      setStatus('booting');
      saveSession(data.sessionId, environment, data.expiresAt);

      subscribeBootEvents(data.sessionId, () => {
        if (!mountedRef.current) return;
        setStatus('ready');
        const remaining = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
        setTimeRemaining(remaining);
        startTick(data.expiresAt);
        startPolling(data.sessionId, data.expiresAt);
      });
    } catch (err) {
      setError(err.message || 'Unexpected error.');
      setStatus('error');
    }
  }, [subscribeBootEvents, startTick, startPolling]);

  const destroySession = useCallback(async (opts = {}) => {
    const currentSession = session;
    stopAll();
    clearSession();
    setSession(null);
    setStatus('idle');
    setError(null);
    setTimeRemaining(0);
    setBootSteps([]);
    if (currentSession?.sessionId) {
      try { await apiFetch(`/api/v1/playground/sessions/${currentSession.sessionId}`, { method: 'DELETE' }); } catch {}
    }
    if (opts.navigate !== false) {
      navigate('/playground?tab=vm');
    }
  }, [session, stopAll, navigate]);

  const extendSession = useCallback(async () => {
    if (!session?.sessionId) return;
    try {
      const res = await apiFetch(`/api/v1/playground/sessions/${session.sessionId}/extend`, { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.expiresAt) {
        setSession(prev => prev ? { ...prev, expiresAt: data.expiresAt, extended: true } : prev);
        saveSession(session.sessionId, session.environment, data.expiresAt);
        startTick(data.expiresAt);
      }
    } catch {}
  }, [session, startTick]);

  useEffect(() => () => { stopAll(); }, [stopAll]);

  const extendAvailable = !!session && timeRemaining > 0 && timeRemaining < 300 && session.extended !== true;

  // Construct WS URL fresh at render time (not baked at creation)
  const wsUrl = session?.sessionId
    ? `${API_URL.replace(/^http/, 'ws')}/playground/ws/${session.sessionId}?token=${encodeURIComponent(getStoredToken() || '')}`
    : null;

  // Construct IDE URL (iframe)
  const ideUrl = session?.sessionId
    ? `${API_URL}/pg-ide/?_s=${session.sessionId}&_t=${encodeURIComponent(getStoredToken() || '')}`
    : null;

  const saveVm = useCallback(async (sessionId, name) => {
    const res = await savesFetch('/api/v1/playground/saves', { method: 'POST', body: JSON.stringify({ sessionId, name }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed');
    await loadSaves();
    return data;
  }, [loadSaves]);

  const restoreVm = useCallback(async (saveId) => {
    const res = await savesFetch(`/api/v1/playground/saves/${saveId}/restore`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Restore failed');
    const newSession = { sessionId: data.sessionId, environment: data.environment, expiresAt: data.expiresAt };
    setSession(newSession);
    setStatus('ready');
    saveSession(data.sessionId, data.environment, data.expiresAt);
    const remaining = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
    setTimeRemaining(remaining);
    startTick(data.expiresAt);
    startPolling(data.sessionId, data.expiresAt);
  }, [loadSaves, startTick, startPolling]);

  const deleteSave = useCallback(async (saveId) => {
    const res = await savesFetch(`/api/v1/playground/saves/${saveId}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
    await loadSaves();
  }, [loadSaves]);

  return {
    session,
    status,
    error,
    timeRemaining,
    bootSteps,
    extendAvailable,
    wsUrl,
    ideUrl,
    createSession,
    destroySession,
    extendSession,
    saves,
    savesLoading,
    slotsUsed,
    slotsMax,
    saveVm,
    restoreVm,
    deleteSave,
  };
}
