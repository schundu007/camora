import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import { createDetectors } from './detectors';
import { evaluate, INITIAL_STATE } from './enforcement';
import { proctorApi } from './api';
import type { EnforcementState, ProctorEvent } from './types';

interface ProctorContextValue {
  events: ProctorEvent[];
  riskScore: number;
  paused: boolean;
  blocked: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  resolveBlock: () => void;
}

const ProctorContext = createContext<ProctorContextValue | null>(null);

export const useProctor = (): ProctorContextValue => {
  const ctx = useContext(ProctorContext);
  if (!ctx) throw new Error('useProctor must be used within ProctorProvider');
  return ctx;
};

interface ProctorProviderProps {
  surface: 'live' | 'coding' | 'design';
  cameraTrack?: MediaStreamTrack;
  children: ReactNode;
}

const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`);

const nowTs = () => (typeof performance !== 'undefined' ? Math.floor(performance.now()) : 0);

export const ProctorProvider = ({ surface, cameraTrack, children }: ProctorProviderProps) => {
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [activeTrack, setActiveTrack] = useState<MediaStreamTrack | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const enforceStateRef = useRef<EnforcementState>(INITIAL_STATE);
  const detectorsRef = useRef<ReturnType<typeof createDetectors> | null>(null);
  const pendingRef = useRef<ProctorEvent[]>([]);
  const riskRef = useRef(0);
  const ownedStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const flush = useCallback(async () => {
    if (!sessionIdRef.current || pendingRef.current.length === 0) return;
    const batch = pendingRef.current;
    pendingRef.current = [];
    try {
      await proctorApi.sendEvents(sessionIdRef.current, batch);
    } catch {
      pendingRef.current = [...batch, ...pendingRef.current]; // retry next tick
    }
  }, []);

  const record = useCallback((partial: Omit<ProctorEvent, 'id'>) => {
    const event: ProctorEvent = { ...partial, id: uid() };
    const { actions, state, scoreDelta } = evaluate(event, enforceStateRef.current);
    enforceStateRef.current = state;

    setEvents((prev) => [...prev, event]);
    riskRef.current += scoreDelta;
    setRiskScore(riskRef.current);
    pendingRef.current.push(event);

    if (actions.includes('pause')) setPaused(true);
    if (actions.includes('block')) setBlocked(true);
    if (event.severity === 'high') void flush(); // high-severity flushes immediately
  }, [flush]);

  const start = useCallback(async () => {
    if (sessionIdRef.current || startingRef.current) return;
    startingRef.current = true;
    try {
      const { id } = await proctorApi.createSession(surface);
      sessionIdRef.current = id;

      // fresh session → reset any state left over from a prior run
      enforceStateRef.current = INITIAL_STATE;
      riskRef.current = 0;
      pendingRef.current = [];
      setEvents([]);
      setRiskScore(0);
      setPaused(false);
      setBlocked(false);

      // Acquire the webcam so camera presence can be enforced. A proctored
      // session requires the candidate's camera on; if a caller didn't supply
      // a track, request one. Denial/absence fails open (logged), never throws.
      let track: MediaStreamTrack | null = cameraTrack ?? null;
      if (!track) {
        const gum = typeof navigator !== 'undefined' ? navigator.mediaDevices?.getUserMedia : undefined;
        if (gum) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (!mountedRef.current) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            ownedStreamRef.current = stream;
            track = stream.getVideoTracks()[0] ?? null;
          } catch {
            record({ type: 'UNSUPPORTED', severity: 'info', ts: nowTs(), meta: { signal: 'camera' } });
          }
        } else {
          record({ type: 'UNSUPPORTED', severity: 'info', ts: nowTs(), meta: { signal: 'camera' } });
        }
      }
      setActiveTrack(track);

      const detectors = createDetectors(record, { cameraTrack: track ?? undefined });
      detectorsRef.current = detectors;
      detectors.start();
    } finally {
      startingRef.current = false;
    }
  }, [surface, cameraTrack, record]);

  const stop = useCallback(async () => {
    detectorsRef.current?.stop();
    detectorsRef.current = null;
    // release a webcam we acquired ourselves (never stop a caller-provided track)
    if (ownedStreamRef.current) {
      ownedStreamRef.current.getTracks().forEach((t) => t.stop());
      ownedStreamRef.current = null;
    }
    setActiveTrack(null);
    await flush();
    if (sessionIdRef.current) {
      await proctorApi.endSession(sessionIdRef.current, riskRef.current, 'ended');
      sessionIdRef.current = null;
    }
  }, [flush]);

  const resolveBlock = useCallback(() => setBlocked(false), []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // camera recovery → auto-resume (keys on the active track, acquired or provided)
  useEffect(() => {
    const track = activeTrack;
    if (!track) return;
    const onLive = () => {
      if (!enforceStateRef.current.cameraDown) return;
      if (track.readyState === 'live' && !track.muted) {
        enforceStateRef.current = { ...enforceStateRef.current, cameraDown: false };
        setPaused(false);
      }
    };
    track.addEventListener('unmute', onLive);
    return () => track.removeEventListener('unmute', onLive);
  }, [activeTrack]);

  // periodic flush
  useEffect(() => {
    const t = setInterval(() => { void flush(); }, 5000);
    return () => clearInterval(t);
  }, [flush]);

  const value = useMemo<ProctorContextValue>(
    () => ({ events, riskScore, paused, blocked, start, stop, resolveBlock }),
    [events, riskScore, paused, blocked, start, stop, resolveBlock],
  );

  return <ProctorContext.Provider value={value}>{children}</ProctorContext.Provider>;
};
