import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_LUMORA_API_URL || 'https://lumorab.cariara.com';
const MAX_CAPTURES = 5;

interface Props {
  kind: 'coding' | 'design';
  onProblemBuilt: (problem: string, starterCode?: string | null, language?: string | null) => void;
}

export function ProblemCaptureStrip({ kind, onProblemBuilt }: Props) {
  const { token } = useAuth();
  const [captures, setCaptures] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDesktop = !!(window as any).camo?.takeScreenshotWindow;

  const handleCapture = useCallback(async () => {
    if (captures.length >= MAX_CAPTURES || isCapturing) return;
    setIsCapturing(true);
    setError(null);
    try {
      const result = await (window as any).camo.takeScreenshotWindow();
      if (!result.ok) { setError(result.error || 'Capture failed'); return; }
      setCaptures(prev => [...prev, result.dataUrl]);
    } catch (e: any) {
      setError(e.message || 'Capture failed');
    } finally {
      setIsCapturing(false);
    }
  }, [captures.length, isCapturing]);

  const handleRemove = useCallback((idx: number) => {
    setCaptures(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleBuild = useCallback(async () => {
    if (captures.length === 0 || isBuilding) return;
    setIsBuilding(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('kind', kind);
      for (let i = 0; i < captures.length; i++) {
        const [header, base64] = captures[i].split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        const bytes = atob(base64);
        const arr = new Uint8Array(bytes.length);
        for (let j = 0; j < bytes.length; j++) arr[j] = bytes.charCodeAt(j);
        formData.append('images', new Blob([arr], { type: mimeType }), `page-${i + 1}.png`);
      }
      const res = await fetch(`${API_URL}/api/v1/coding/construct-from-images`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || d.error || `Error ${res.status}`);
      }
      const data = await res.json();
      onProblemBuilt(data.problem, data.starter_code ?? null, data.detected_language ?? null);
      setCaptures([]);
    } catch (e: any) {
      setError(e.message || 'Build failed');
    } finally {
      setIsBuilding(false);
    }
  }, [captures, isBuilding, kind, token, onProblemBuilt]);

  if (!isDesktop) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCapture}
          disabled={isCapturing || captures.length >= MAX_CAPTURES}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
          style={{ background: 'var(--cam-primary)', color: 'white' }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          {isCapturing
            ? 'Picking window…'
            : captures.length > 0
              ? `Capture page ${captures.length + 1}${captures.length >= MAX_CAPTURES ? ' (max)' : ''}`
              : 'Capture Window'}
        </button>

        {captures.length > 0 && (
          <button
            type="button"
            onClick={handleBuild}
            disabled={isBuilding}
            className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--cam-gold-leaf)', color: '#000' }}
          >
            {isBuilding
              ? 'Building problem…'
              : `Build Problem Statement (${captures.length} page${captures.length > 1 ? 's' : ''})`}
          </button>
        )}
      </div>

      {captures.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {captures.map((url, i) => (
            <div
              key={i}
              className="relative group w-20 h-14 rounded overflow-hidden flex-shrink-0"
              style={{ border: '1px solid var(--border)' }}
            >
              <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
              <span
                className="absolute top-0.5 left-0.5 text-[9px] font-bold px-1 rounded leading-4"
                style={{ background: 'var(--cam-primary)', color: 'white' }}
              >
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.75)', color: 'white' }}
              >
                <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 10 10">
                  <path d="M1 1l8 8M9 1L1 9" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
