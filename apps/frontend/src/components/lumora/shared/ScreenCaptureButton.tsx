import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── ScreenCaptureButton ────────────────────────────────────────
   "Capture problem" flow. Two paths depending on environment:

   1. Desktop (Electron): the main process exposes `camo.listCaptureSources`
      which calls desktopCapturer.getSources and returns thumbnails. We
      render our own picker modal so the user can choose which window
      (HackerRank tab, CodeSignal tab, design canvas, etc.) to OCR. This
      replaces the default getDisplayMedia handler that auto-picked the
      primary screen — no picker showed up at all, so users had no way
      to target a specific window.

   2. Browser: navigator.mediaDevices.getDisplayMedia falls back to the
      browser's native picker.

   Either path captures a single JPEG frame and POSTs it to
   /api/v1/coding/capture which runs Claude Vision OCR and returns the
   cleaned problem statement, then onCaptured is called with the text. */

type CaptureKind = 'coding' | 'design';

interface CaptureSource {
  id: string;
  name: string;
  kind: 'screen' | 'window';
  thumbnail: string; // data URL
}

interface Props {
  kind?: CaptureKind;
  onCaptured: (text: string) => void;
  /** Visual style: 'icon' = square icon-only (top bar), 'label' = icon + text (tab headers) */
  variant?: 'icon' | 'label';
  className?: string;
  /** Override the tooltip / label text */
  label?: string;
}

export default function ScreenCaptureButton({ kind = 'coding', onCaptured, variant = 'icon', className, label }: Props) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pickerSources, setPickerSources] = useState<CaptureSource[] | null>(null);

  // Capture a single frame from a MediaStream, return as JPEG data URL.
  const grabFrame = useCallback(async (stream: MediaStream): Promise<string> => {
    const track = stream.getVideoTracks()[0];
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    // Wait for first decoded frame
    await new Promise(r => setTimeout(r, 200));
    const settings = track.getSettings();
    const w = video.videoWidth || settings.width || 1280;
    const h = video.videoHeight || settings.height || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Couldn't open canvas");
    ctx.drawImage(video, 0, 0, w, h);
    stream.getTracks().forEach(t => t.stop());
    video.srcObject = null;
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // Send the captured frame to the OCR endpoint and surface the result.
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
    if (!res.ok) throw new Error(body?.error || `Capture failed (${res.status})`);
    if (!body?.problem) throw new Error('No problem returned');
    onCaptured(body.problem);
    setStatus(null);
  }, [kind, onCaptured, token]);

  // Capture a specific source by id (Electron only — uses chromeMediaSourceId).
  const captureBySourceId = useCallback(async (sourceId: string) => {
    setBusy(true);
    setStatus('Capturing…');
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore — Chromium-specific constraints accepted by Electron's
          // desktopCapturer for chromeMediaSourceId-based capture. Without
          // maxWidth/maxHeight the default frame is small (~640×360) and
          // Claude Vision OCR fails with 422 "couldn't find a problem".
          // Bump to 4K so a full LeetCode / HackerRank tab captures every
          // line of the problem statement at readable resolution.
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 3840,
            minHeight: 720,
            maxHeight: 2160,
            maxFrameRate: 1,
          },
        } as any,
      });
      const dataUrl = await grabFrame(stream);
      stream = null;
      await ocrAndDeliver(dataUrl);
      setStatus(null);
    } catch (err: any) {
      console.error('[capture] source capture failed:', err);
      // Keep the error visible — auto-clearing meant the user clicked
      // capture, picked a window, the modal closed, and they saw nothing
      // because the toast had already cleared by the time they looked.
      setStatus(err?.message || 'Capture failed');
    } finally {
      if (stream) stream.getTracks().forEach(t => t.stop());
      setBusy(false);
    }
  }, [grabFrame, ocrAndDeliver]);

  const capture = useCallback(async () => {
    if (busy) return;
    setStatus(null);

    const camo = (window as any).camo;
    // Desktop path: open our own picker modal seeded from desktopCapturer.
    if (camo?.isDesktop && typeof camo.listCaptureSources === 'function') {
      // Pre-check Screen Recording TCC. Without it, getSources returns
      // sources but the subsequent getUserMedia({chromeMediaSourceId})
      // call fails silently — the picker closes with no feedback and
      // the user thinks the button is broken. Surface the permission
      // gap up front instead.
      if (camo.platform === 'darwin' && typeof camo.getMediaAccessStatus === 'function') {
        try {
          const screenStatus = await camo.getMediaAccessStatus('screen');
          if (screenStatus !== 'granted') {
            setStatus('Screen Recording permission needed — click here to open System Settings');
            // Open Settings on the next click of the toast, or directly:
            camo.openSystemPrivacy?.('ScreenCapture');
            return;
          }
        } catch { /* non-fatal */ }
      }
      try {
        setBusy(true);
        setStatus('Loading windows…');
        const sources: CaptureSource[] = await camo.listCaptureSources();
        setBusy(false);
        setStatus(null);
        if (!Array.isArray(sources) || sources.length === 0) {
          setStatus('No windows or screens found to capture');
          return;
        }
        setPickerSources(sources);
      } catch (err: any) {
        console.error('[capture] listCaptureSources failed:', err);
        setBusy(false);
        setStatus(err?.message || 'Could not list capture sources');
      }
      return;
    }

    // Browser fallback: getDisplayMedia (browser shows its own picker).
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus('Screen capture not supported in this browser');
      return;
    }
    let stream: MediaStream | null = null;
    try {
      setBusy(true);
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 } as MediaTrackConstraints,
        audio: false,
      });
      const dataUrl = await grabFrame(stream);
      stream = null;
      await ocrAndDeliver(dataUrl);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        // User cancelled the picker — not an error worth showing
        setStatus(null);
      } else {
        setStatus(err?.message || 'Capture failed');
      }
    } finally {
      if (stream) stream.getTracks().forEach(t => t.stop());
      setBusy(false);
    }
  }, [busy, grabFrame, ocrAndDeliver]);

  const tooltip = label || (kind === 'design' ? 'Capture design problem' : 'Capture coding problem');

  // Render the trigger plus the desktop-only picker modal.
  return (
    <>
      {variant === 'label' ? (
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
      )}

      {pickerSources && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick a window to capture"
          className="fixed inset-0 z-[1000] flex items-center justify-center px-4 py-6"
          style={{ background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPickerSources(null); }}
        >
          <div
            className="w-full max-w-3xl rounded-2xl flex flex-col"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
              maxHeight: '88vh',
            }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Pick the {kind === 'design' ? 'design' : 'coding'} problem to capture</h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Choose the window or screen showing the problem. We grab one frame and OCR it; we don't keep the screenshot.
                </p>
              </div>
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
            <div className="flex-1 overflow-auto p-4">
              {(['window', 'screen'] as const).map((group) => {
                const items = pickerSources.filter((s) => s.kind === group);
                if (items.length === 0) return null;
                return (
                  <section key={group} className="mb-5 last:mb-0">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                      {group === 'window' ? 'Application windows' : 'Entire screens'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {items.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setPickerSources(null);
                            void captureBySourceId(s.id);
                          }}
                          className="text-left rounded-lg overflow-hidden transition-all hover:scale-[1.02]"
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                        >
                          {s.thumbnail
                            ? <img src={s.thumbnail} alt={s.name} className="block w-full" style={{ aspectRatio: '16 / 10', objectFit: 'cover' }} />
                            : <div className="w-full" style={{ aspectRatio: '16 / 10', background: 'var(--bg-surface)' }} />
                          }
                          <div className="px-2.5 py-2">
                            <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }} title={s.name}>{s.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
