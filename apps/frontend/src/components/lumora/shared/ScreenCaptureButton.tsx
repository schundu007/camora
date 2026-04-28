import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── ScreenCaptureButton ───────────────────────────────────────────────
   NO MODAL. NO IN-APP PICKER. EVER.

   Desktop: click → Camora hides → macOS draws its own window-select
   cursor (camera icon, click any window to capture) → captures →
   Camora reappears → OCR → answer.

   Browser: click → browser's native getDisplayMedia picker → pick →
   capture → OCR → answer. */

type CaptureKind = 'coding' | 'design';

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

  // Browser fallback only — encodes the captured frame as a JPEG q85
  // through canvas so the upload is always under the 5 MB Anthropic cap.
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
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  const capture = useCallback(async () => {
    if (busy) return;
    setStatus(null);

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus('Screen capture not supported in this browser');
      return;
    }

    // One path for both browser and desktop. On the desktop, macOS
    // Sequoia+ shows Apple's own system picker (windows, displays,
    // Chrome tabs) via Electron's setDisplayMediaRequestHandler with
    // useSystemPicker: true. On a regular browser, Chrome/Safari
    // shows its own picker. No in-app modal, no native cursor.
    let stream: MediaStream | null = null;
    try {
      setBusy(true);
      setStatus('Pick a window…');
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 } as MediaTrackConstraints,
        audio: false,
      });
      setStatus('Capturing…');
      const dataUrl = await grabFrameFromStream(stream);
      stream = null;
      await ocrAndDeliver(dataUrl);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
        // User canceled the picker, or Screen Recording denied.
        const camo = (window as any).camo;
        const screenStatus = await camo?.getMediaAccessStatus?.('screen').catch(() => null);
        if (screenStatus && screenStatus !== 'granted') {
          camo?.openSystemPrivacy?.('ScreenCapture');
          setStatus('Grant Screen Recording in System Settings');
        } else {
          setStatus(null);
        }
      } else {
        console.error('[capture] getDisplayMedia failed:', err);
        setStatus(err?.message || 'Capture failed');
      }
    } finally {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setBusy(false);
    }
  }, [busy, grabFrameFromStream, ocrAndDeliver]);

  const tooltip = label || (kind === 'design' ? 'Capture design problem' : 'Capture coding problem');

  if (variant === 'label') {
    return (
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
    );
  }

  return (
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
}
