import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

/* ── ScreenCaptureButton ────────────────────────────────────────
   One-click "Capture problem" flow. Uses the browser's
   getDisplayMedia API to prompt the user to pick their
   HackerRank/CodeSignal/etc. tab, grabs a single JPEG frame,
   and POSTs it to /api/v1/coding/capture which runs Claude Vision
   OCR and returns the cleaned problem statement.

   On success the extracted text is handed back via onCaptured,
   so the caller can drop it into its problem input (or auto-submit
   — that's the caller's decision, not ours). */

type CaptureKind = 'coding' | 'design';

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

  const capture = useCallback(async () => {
    if (busy) return;
    setStatus(null);

    // Browser support gate
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

      // Pull one frame — create a video element, draw it to canvas.
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      // Give the browser a tick so the first frame is decoded
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

      // Stop the stream immediately — we only wanted one frame
      stream.getTracks().forEach(t => t.stop());
      stream = null;
      video.srcObject = null;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      setStatus('Reading problem…');
      const res = await fetch(`${API_URL}/api/v1/coding/capture`, {
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
  }, [busy, kind, onCaptured, token]);

  const tooltip = label || (kind === 'design' ? 'Capture design problem' : 'Capture coding problem');

  if (variant === 'label') {
    return (
      <button
        type="button"
        onClick={capture}
        disabled={busy}
        title={tooltip}
        aria-label={tooltip}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${className || ''}`}
        style={{ background: busy ? 'rgba(230,57,70,0.15)' : 'rgba(230,57,70,0.1)', color: 'var(--cam-primary)', border: '1px solid rgba(230,57,70,0.3)' }}
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
      style={{ color: busy ? 'var(--cam-primary)' : 'var(--text-secondary, #334155)' }}
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
