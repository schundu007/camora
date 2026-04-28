import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── ScreenCaptureButton ───────────────────────────────────────────────
   Yesterday's working UX, restored:
     1. Click Capture
     2. In-app picker opens INSTANTLY (no thumbnails, just titles)
     3. Click your LeetCode/HackerRank/etc. window
     4. Captured at full native resolution → OCR → answer

   Two paths:

     • Desktop (Electron): camo.listWindows / camo.captureWindow.
       Picker fetches in tens of ms (1×1 thumbnails). Capture invokes
       /usr/sbin/screencapture -l<windowID> in the main process —
       triggers SR permission prompt naturally on first call. PNG
       is auto-downscaled in main.js so the upload is always <5 MB.

     • Browser: navigator.mediaDevices.getDisplayMedia (browser-native
       picker provided by Chrome/Safari). */

type CaptureKind = 'coding' | 'design';

interface CaptureSource {
  id: string;
  name: string;
  kind: 'screen' | 'window';
}

interface Props {
  kind?: CaptureKind;
  onCaptured: (text: string) => void;
  variant?: 'icon' | 'label';
  className?: string;
  label?: string;
}

export default function ScreenCaptureButton({ kind = 'coding', onCaptured, variant = 'icon', className, label }: Props) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // null = picker closed; [] = picker open & loading; [...] = list ready
  const [pickerSources, setPickerSources] = useState<CaptureSource[] | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const ocrAndDeliver = useCallback(async (dataUrl: string) => {
    setStatus('Reading problem…');
    const res = await fetch(`${API_URL}/api/v1/coding/capture`, {
      credentials: 'include',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ image: dataUrl, kind }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || body?.detail || `Capture failed (${res.status})`);
    if (!body?.problem) throw new Error('No problem text returned');
    onCaptured(body.problem);
    setStatus(null);
  }, [kind, onCaptured, token]);

  const captureBySourceId = useCallback(async (sourceId: string) => {
    const camo = (window as any).camo;
    if (!camo?.captureWindow) {
      setStatus('Capture not supported');
      return;
    }
    setBusy(true);
    setStatus('Capturing…');
    try {
      const png: string | null = await camo.captureWindow(sourceId);
      if (!png) {
        // SR permission denied or other capture failure.
        const screenStatus = await camo.getMediaAccessStatus?.('screen').catch(() => null);
        if (screenStatus && screenStatus !== 'granted') {
          camo.openSystemPrivacy?.('ScreenCapture');
          throw new Error('Grant Screen Recording in System Settings, then try again');
        }
        throw new Error('Capture failed — try a different window');
      }
      await ocrAndDeliver(png);
    } catch (err: any) {
      console.error('[capture] window capture failed:', err);
      setStatus(err?.message || 'Capture failed');
    } finally {
      setBusy(false);
    }
  }, [ocrAndDeliver]);

  // Browser fallback: capture from a getDisplayMedia stream.
  const grabFrameFromStream = useCallback(async (stream: MediaStream): Promise<string> => {
    const track = stream.getVideoTracks()[0];
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 200));
    const settings = track.getSettings();
    const w = video.videoWidth || settings.width || 1280;
    const h = video.videoHeight || settings.height || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Couldn't open canvas");
    ctx.drawImage(video, 0, 0, w, h);
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    // Browser path: re-encode through canvas as JPEG q85 to keep upload <5 MB.
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const capture = useCallback(async () => {
    if (busy) return;
    setStatus(null);

    const camo = (window as any).camo;
    if (camo?.isDesktop && typeof camo.listWindows === 'function') {
      // Open picker IMMEDIATELY with empty array (= loading state).
      setPickerSources([]);
      setPickerError(null);
      setPickerQuery('');
      try {
        const sources: CaptureSource[] = await camo.listWindows();
        if (!Array.isArray(sources) || sources.length === 0) {
          setPickerError('No windows or screens detected');
          return;
        }
        setPickerSources(sources);
      } catch (err: any) {
        console.error('[capture] listWindows failed:', err);
        setPickerError(err?.message || 'Could not list windows');
      }
      return;
    }

    // Browser fallback.
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus('Screen capture not supported in this browser');
      return;
    }
    let stream: MediaStream | null = null;
    try {
      setBusy(true);
      setStatus('Pick a window…');
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 } as MediaTrackConstraints,
        audio: false,
      });
      const dataUrl = await grabFrameFromStream(stream);
      stream = null;
      await ocrAndDeliver(dataUrl);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        setStatus(null);
      } else {
        console.error('[capture] getDisplayMedia failed:', err);
        setStatus(err?.message || 'Capture failed');
      }
    } finally {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setBusy(false);
    }
  }, [busy, grabFrameFromStream, ocrAndDeliver]);

  // Close picker on Escape.
  useEffect(() => {
    if (pickerSources === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerSources(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerSources]);

  const tooltip = label || (kind === 'design' ? 'Capture design problem' : 'Capture coding problem');

  // Filter + group sources by kind (windows shown above screens).
  const filtered = useMemo(() => {
    if (!pickerSources) return { windows: [], screens: [] };
    const q = pickerQuery.trim().toLowerCase();
    const items = q
      ? pickerSources.filter((s) => s.name.toLowerCase().includes(q))
      : pickerSources;
    return {
      windows: items.filter((s) => s.kind === 'window'),
      screens: items.filter((s) => s.kind === 'screen'),
    };
  }, [pickerSources, pickerQuery]);

  const trigger = variant === 'label' ? (
    <button
      type="button"
      onClick={capture}
      disabled={busy}
      title={status || tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${className || ''}`}
      style={{ background: 'var(--accent-subtle)', color: 'var(--cam-primary)', border: '1px solid var(--border)', opacity: busy ? 0.85 : 1 }}
    >
      {busy ? (
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M8 5l1.5-2h5L16 5" />
        </svg>
      )}
      <span>{status || (busy ? 'Capturing…' : 'Capture')}</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={capture}
      disabled={busy}
      title={status || tooltip}
      aria-label={tooltip}
      className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors disabled:opacity-60 ${className || ''}`}
      style={{ color: busy ? 'var(--cam-primary)' : 'var(--text-secondary)' }}
    >
      {busy ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M8 5l1.5-2h5L16 5" />
        </svg>
      )}
    </button>
  );

  return (
    <>
      {trigger}
      {pickerSources !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick a window to capture"
          className="fixed inset-0 z-[1000] flex items-start justify-center px-4 py-12"
          style={{ background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPickerSources(null); }}
        >
          <div
            className="w-full max-w-xl rounded-2xl flex flex-col"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
              maxHeight: '80vh',
            }}
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Pick a window</h2>
                <button
                  type="button"
                  onClick={() => setPickerSources(null)}
                  className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <input
                type="text"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                autoFocus
                placeholder="Filter (e.g. leetcode, hackerrank, design)…"
                className="w-full px-3 py-2 text-[13px] rounded-md outline-none"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex-1 overflow-auto py-2">
              {pickerError && (
                <div className="px-5 py-3 text-[12px]" style={{ color: 'var(--danger)' }}>{pickerError}</div>
              )}
              {!pickerError && pickerSources.length === 0 && (
                <div className="px-5 py-6 text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
                  Loading windows…
                </div>
              )}
              {pickerSources.length > 0 && (
                <>
                  {filtered.windows.length > 0 && (
                    <Group label="Application windows" items={filtered.windows} onPick={(id) => { setPickerSources(null); void captureBySourceId(id); }} kind="window" />
                  )}
                  {filtered.screens.length > 0 && (
                    <Group label="Entire screens" items={filtered.screens} onPick={(id) => { setPickerSources(null); void captureBySourceId(id); }} kind="screen" />
                  )}
                  {filtered.windows.length === 0 && filtered.screens.length === 0 && (
                    <div className="px-5 py-6 text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
                      No matches for "{pickerQuery}"
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ label, items, onPick, kind }: { label: string; items: CaptureSource[]; onPick: (id: string) => void; kind: 'window' | 'screen' }) {
  return (
    <section className="px-2 py-1">
      <h3 className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</h3>
      <ul>
        {items.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onPick(s.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left hover:opacity-100"
              style={{ color: 'var(--text-primary)', background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                {kind === 'window' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
                  </svg>
                )}
              </span>
              <span className="text-[13px] truncate" title={s.name}>{s.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
