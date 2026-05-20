import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useInterviewStore } from '@/stores/interview-store';
import { dialogAlert } from '@/components/shared/Dialog';

const API_BASE_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';

export interface ScreenshotEntry {
  id: string;
  dataUrl: string;
  text: string;
}

interface ScreenshotStripProps {
  surface: 'coding' | 'design' | 'behavioral' | 'cofix';
  screenshots: ScreenshotEntry[];
  onSnapped: (entry: ScreenshotEntry) => void;
  onRemove: (id: string) => void;
}

/** Shared pill chrome — matches the LumoraShellPage tab nav exactly. */
const pillBase = 'flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-[0.12em] transition-[background-color,color,opacity] active:scale-[0.97]';

export function ScreenshotStrip({ surface, screenshots, onSnapped, onRemove }: ScreenshotStripProps) {
  const { token } = useAuth();
  const isStealthActive = useInterviewStore(s => s.isStealthActive);
  const setIsStealthActive = useInterviewStore(s => s.setIsStealthActive);
  const [snapState, setSnapState] = useState<'idle' | 'capturing' | 'error'>('idle');
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  // Bug 3: stale closure ref for onSnapped callback
  const onSnappedRef = useRef(onSnapped);
  useEffect(() => { onSnappedRef.current = onSnapped; }, [onSnapped]);

  const handleStealthMode = useCallback(async () => {
    const camo = (window as any).camo;
    if (!camo?.setStealthMode) {
      await dialogAlert({ title: 'Desktop only', message: 'Stealth mode requires the Camora desktop app.' });
      return;
    }
    const next = !isStealthActive;
    await camo.setStealthMode(next);
    setIsStealthActive(next);
  }, [isStealthActive, setIsStealthActive]);

  const handleSnap = useCallback(async () => {
    const camo = (window as any).camo;
    const id = `snap-${Date.now()}`;
    setSnapState('capturing');
    try {
      let dataUrl: string;
      if (camo?.snapActiveBrowser) {
        const result = await camo.snapActiveBrowser();
        if (result?.error) throw new Error(result.error);
        const blob = await fetch(result.dataUrl || result).then(r => r.blob());
        dataUrl = await new Promise<string>(res => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        try {
          const imageCapture = new (window as any).ImageCapture(track);
          const bitmap = await imageCapture.grabFrame();
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('canvas 2d context unavailable');
          ctx.drawImage(bitmap, 0, 0);
          dataUrl = canvas.toDataURL('image/png');
        } finally {
          track.stop();
        }
      }
      // Show loading spinner for this snap
      const tempEntry: ScreenshotEntry = { id, dataUrl, text: '' };
      setPendingIds(prev => [...prev, id]);
      setSnapState('idle');
      // OCR
      try {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('image', new File([blob], 'snap.png', { type: 'image/png' }));
        const resp = await fetch(`${API_BASE_URL}/api/v1/coding/extract-from-image`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!resp.ok) throw new Error(`OCR failed: ${resp.status}`);
        const data = await resp.json();
        const text = data.text || data.problem_text || '';
        onSnappedRef.current({ ...tempEntry, text });
      } catch {
        onSnappedRef.current({ ...tempEntry, text: '' });
      } finally {
        setPendingIds(prev => prev.filter(pid => pid !== id));
      }
    } catch {
      setSnapState('error');
      setTimeout(() => setSnapState('idle'), 3000);
      setPendingIds(prev => prev.filter(pid => pid !== id));
    }
  }, [token, onSnapped]);

  const showSnap = surface !== 'behavioral';

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar"
      style={{
        background: 'var(--cam-hero-strip)',
        borderBottom: '1px solid var(--cam-gold-leaf)',
        minHeight: 36,
      }}
    >
      {/* Snap button */}
      {showSnap && (
        <button
          onClick={handleSnap}
          disabled={snapState === 'capturing'}
          title={snapState === 'error' ? 'Snap failed — check Screen Recording permission' : 'Snap screen (append to problem)'}
          className={pillBase}
          style={snapState === 'error'
            ? { background: '#ef4444', color: '#fff' }
            : { background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.18)' }
          }
        >
          {snapState === 'capturing'
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            : snapState === 'error'
            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
          }
          {snapState === 'error' ? 'Failed' : snapState === 'capturing' ? 'Capturing…' : 'Snap'}
        </button>
      )}

      {/* Pending (OCR in flight) thumbnails */}
      {showSnap && pendingIds.map(pid => (
        <div
          key={pid}
          className="relative w-10 h-7 rounded shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
        >
          <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      ))}

      {/* Completed screenshot thumbnails */}
      {showSnap && screenshots.map((s, i) => (
        <div key={s.id} className="relative group shrink-0" title={s.text ? `Page ${i + 1}: ${s.text.slice(0, 80)}…` : `Page ${i + 1}`}>
          <img
            src={s.dataUrl}
            alt={`Screenshot ${i + 1}`}
            className="h-7 w-10 object-cover rounded"
            style={{ border: '1px solid rgba(255,255,255,0.20)' }}
          />
          <span
            className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }}
          >
            {i + 1}
          </span>
          <button
            onClick={() => onRemove(s.id)}
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full items-center justify-center hidden group-hover:flex"
            style={{ background: '#ef4444', color: '#fff' }}
            title="Remove screenshot"
          >
            <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      ))}

      {/* Screenshot count label when >0 */}
      {showSnap && screenshots.length > 0 && (
        <span className="text-[10px] font-semibold shrink-0" style={{ color: 'var(--cam-gold-leaf-lt)' }}>
          {screenshots.length} page{screenshots.length > 1 ? 's' : ''}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stealth — desktop only */}
      {!!(window as any).camo?.isDesktop && (
        <button
          onClick={handleStealthMode}
          title={isStealthActive ? 'Stealth ON — mouse tracking blocked app-wide' : 'Block mouse tracking (app-wide)'}
          className={pillBase}
          style={isStealthActive
            ? { background: 'var(--cam-gold-leaf)', color: 'var(--cam-primary-dk)' }
            : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' }
          }
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {isStealthActive
              ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
              : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
            }
          </svg>
          {isStealthActive ? 'Stealth ON' : 'Stealth'}
        </button>
      )}
    </div>
  );
}
