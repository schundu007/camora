import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDiagramCache, setDiagramCache } from '@/hooks/useDiagramCache';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface SharedDiagramProps {
  question: string;
  className?: string;
  showControls?: boolean;
  defaultProvider?: string;
  defaultDirection?: 'LR' | 'TB';
  defaultDetail?: 'overview' | 'detailed';
}

/**
 * Unified architecture diagram component.
 * Used by: Lumora Interview, Lumora Design, Capra Dashboard, Capra Practice
 *
 * Features:
 * - Cache-first lookup (no per-request generation)
 * - Cloud provider selector (Auto/AWS/Azure/GCP)
 * - Direction toggle (LR/TB)
 * - Detail level (Overview/Detailed)
 * - Pan & zoom on image
 * - Generate button for cache misses
 */
export default function SharedDiagram({
  question,
  className = '',
  showControls = true,
  defaultProvider = 'auto',
  defaultDirection = 'TB',
  defaultDetail = 'overview',
}: SharedDiagramProps) {
  const { token } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [noCache, setNoCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState(defaultProvider);
  const [direction, setDirection] = useState(defaultDirection);
  const [detail, setDetail] = useState(defaultDetail);

  // Pan & zoom
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const transStart = useRef({ x: 0, y: 0 });
  const resetView = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }); }, []);

  // Cache lookup
  useEffect(() => {
    if (!question || !token) return;
    const key = `${question}::${provider}::${direction}::${detail}`;
    const mem = getDiagramCache(key);
    if (mem) { setImageUrl(mem.data); setNoCache(false); setLoading(false); resetView(); return; }

    let cancelled = false;
    setLoading(true); setNoCache(false); setError(null);

    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/diagram/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question, cloudProvider: provider, detailLevel: detail, direction }),
        });
        const data = await r.json();
        if (!cancelled) {
          if (data.success && data.image_url) {
            const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
            setImageUrl(url);
            setDiagramCache(key, { type: 'png', data: url, timestamp: Date.now() });
            resetView();
          } else { setNoCache(true); }
          setLoading(false);
        }
      } catch { if (!cancelled) { setNoCache(true); setLoading(false); } }
    })();
    return () => { cancelled = true; };
  }, [question, token, provider, direction, detail, resetView]);

  // Generate
  const handleGenerate = async () => {
    if (!question || !token || generating) return;
    setGenerating(true); setError(null); setNoCache(false);
    try {
      const r = await fetch(`${API_URL}/api/diagram/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, cloudProvider: provider, detailLevel: detail, direction }),
      });
      const data = await r.json();
      if (data.success && data.image_url) {
        const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
        setImageUrl(url);
        setDiagramCache(`${question}::${provider}::${direction}::${detail}`, { type: 'png', data: url, timestamp: Date.now() });
        resetView();
      } else { setError(data.error || 'Generation failed'); }
    } catch (e: any) { setError(e.message); }
    setGenerating(false);
  };

  return (
    <div className={className}>
      {showControls && (
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <select value={provider} onChange={e => setProvider(e.target.value)}
              className="text-xs font-mono bg-transparent border border-gray-200 rounded px-2.5 py-1.5 min-h-[36px] text-gray-500">
              <option value="auto">Auto</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </select>
            <div className="flex border border-gray-200 rounded overflow-hidden">
              {(['LR', 'TB'] as const).map(d => (
                <button key={d} onClick={() => setDirection(d)}
                  className={`px-2.5 py-1.5 min-h-[36px] text-xs font-mono ${d !== 'LR' ? 'border-l border-gray-200' : ''} ${
                    direction === d ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>{d}</button>
              ))}
            </div>
            <div className="flex border border-gray-200 rounded overflow-hidden">
              {(['overview', 'detailed'] as const).map(d => (
                <button key={d} onClick={() => setDetail(d)}
                  className={`px-2.5 py-1.5 min-h-[36px] text-xs font-mono capitalize ${d !== 'overview' ? 'border-l border-gray-200' : ''} ${
                    detail === d ? 'bg-emerald-500 text-white' : 'text-gray-500'}`}>{d}</button>
              ))}
            </div>
          </div>
          {imageUrl && (
            <div className="flex items-center gap-1">
              <button onClick={() => setScale(s => Math.min(s + 0.25, 4))} className="px-2.5 py-1.5 min-h-[36px] text-xs border rounded text-gray-500">+</button>
              <span className="text-xs text-gray-400 min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.max(s - 0.25, 0.3))} className="px-2.5 py-1.5 min-h-[36px] text-xs border rounded text-gray-500">-</button>
              <button onClick={resetView} className="px-2.5 py-1.5 min-h-[36px] text-xs border rounded text-gray-500 ml-1">Fit</button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-6 rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {noCache && !loading && !generating && (
        <div className="flex items-center justify-center p-6 rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <button onClick={handleGenerate}
            className="px-5 py-2.5 text-sm font-bold text-white rounded-lg"
            style={{ background: 'linear-gradient(135deg, #10b981, #76B900)', boxShadow: '0 2px 12px rgba(16,185,129,0.3)' }}>
            Generate Diagram
          </button>
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center gap-3 p-6 rounded-lg bg-emerald-50 border border-emerald-200">
          <div className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
          <span className="text-sm text-emerald-700 font-mono">Generating...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-700">{error}</p>
          <button onClick={handleGenerate} className="mt-2 px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded">Retry</button>
        </div>
      )}

      {imageUrl && !loading && !generating && (
        <div className="rounded-lg select-none flex items-center justify-center"
          style={{ cursor: dragging ? 'grabbing' : 'grab', overflow: 'hidden', minHeight: 250, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          onWheel={e => { e.preventDefault(); setScale(s => Math.min(Math.max(0.3, s + (e.deltaY > 0 ? -0.1 : 0.1)), 4)); }}
          onMouseDown={e => { if (e.button !== 0) return; setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY }; transStart.current = { ...translate }; }}
          onMouseMove={e => { if (!dragging) return; setTranslate({ x: transStart.current.x + (e.clientX - dragStart.current.x), y: transStart.current.y + (e.clientY - dragStart.current.y) }); }}
          onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
          <img src={imageUrl} alt="Architecture diagram" draggable={false}
            style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: 'center', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}
