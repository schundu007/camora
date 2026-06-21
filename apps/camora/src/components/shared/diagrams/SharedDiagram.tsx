import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDiagramCache, setDiagramCache } from '@/hooks/useDiagramCache';
import { useCloudProvider } from '@/hooks/useCloudProvider';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface SharedDiagramProps {
  question: string;
  className?: string;
  showControls?: boolean;
}

/**
 * Unified architecture diagram component.
 * Used by: Lumora Session, Lumora Design, Capra Dashboard, Capra Practice
 *
 * Features:
 * - Cache-first lookup (no per-request generation)
 * - Cloud provider selector (Auto/AWS/Azure/GCP)
 * - Pan & zoom on image
 * - Generate button for cache misses
 *
 * Direction is locked to LR and detail-level to detailed — extra knobs added
 * confusion without changing perceived quality. One layout, one density.
 */
const DIRECTION = 'TB';
const DETAIL = 'detailed';

export default function SharedDiagram({
  question,
  className = '',
  showControls = true,
}: SharedDiagramProps) {
  const { token } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [noCache, setNoCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useCloudProvider();

  const [zoom, setZoom] = useState(150);

  // Cache lookup
  useEffect(() => {
    if (!question || !token) return;
    const key = `${question}::${provider}::${DIRECTION}::${DETAIL}`;
    const mem = getDiagramCache(key);
    if (mem) { setImageUrl(mem.data); setNoCache(false); setLoading(false); setZoom(150); return; }

    let cancelled = false;
    setLoading(true); setNoCache(false); setError(null);

    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/diagram/lookup`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question, cloudProvider: provider, detailLevel: DETAIL, direction: DIRECTION }),
        });
        const data = await r.json();
        if (!cancelled) {
          if (data.success && data.image_url) {
            const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
            setImageUrl(url);
            setDiagramCache(key, { type: 'png', data: url, timestamp: Date.now() });
            setZoom(150);
          } else { setNoCache(true); }
          setLoading(false);
        }
      } catch { if (!cancelled) { setNoCache(true); setLoading(false); } }
    })();
    return () => { cancelled = true; };
  }, [question, token, provider]);

  // Generate
  const handleGenerate = async () => {
    if (!question || !token || generating) return;
    setGenerating(true); setError(null); setNoCache(false);
    try {
      const r = await fetch(`${API_URL}/api/diagram/generate`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, cloudProvider: provider, detailLevel: DETAIL, direction: DIRECTION }),
      });
      const data = await r.json();
      if (data.success && data.image_url) {
        const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
        setImageUrl(url);
        setDiagramCache(`${question}::${provider}::${DIRECTION}::${DETAIL}`, { type: 'png', data: url, timestamp: Date.now() });
        setZoom(150);
      } else { setError(data.error || 'Generation failed'); }
    } catch (e: any) { setError(e.message); }
    setGenerating(false);
  };

  return (
    <div className={className}>
      {showControls && (
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <select value={provider} onChange={e => setProvider(e.target.value as 'auto' | 'aws' | 'azure' | 'gcp')}
              className="text-xs font-mono bg-transparent border border-gray-200 rounded px-2.5 py-1.5 min-h-[36px] text-[var(--text-secondary)]">
              <option value="auto">Auto</option>
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </select>
          </div>
          {imageUrl && (
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.min(z + 25, 400))} className="px-2.5 py-1.5 min-h-[36px] text-xs border rounded text-[var(--text-secondary)]">+</button>
              <span className="text-xs text-[var(--text-muted)] min-w-[4ch] text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.max(z - 25, 50))} className="px-2.5 py-1.5 min-h-[36px] text-xs border rounded text-[var(--text-secondary)]">-</button>
              <button onClick={() => setZoom(100)} className="px-2.5 py-1.5 min-h-[36px] text-xs border rounded text-[var(--text-secondary)] ml-1">Fit</button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-6 rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="w-5 h-5 border-2 border-blue-200 border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
      )}

      {noCache && !loading && !generating && (
        <div className="flex items-center justify-center p-6 rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <button onClick={handleGenerate}
            className="px-5 py-2.5 text-sm font-bold text-white rounded-lg"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 12px rgba(38,97,156,0.30)' }}>
            Generate Diagram
          </button>
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center gap-3 p-6 rounded-lg bg-[rgba(38,97,156,0.08)] border border-[rgba(38,97,156,0.25)]">
          <div className="w-5 h-5 border-2 border-[rgba(38,97,156,0.4)] border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>Generating...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-[var(--danger)]/5 border border-[var(--danger)]/20">
          <p className="text-sm text-[var(--danger)]">{error}</p>
          <button onClick={handleGenerate} className="mt-2 px-3 py-1 text-xs bg-[var(--danger)]/10 text-[var(--danger)] rounded">Retry</button>
        </div>
      )}

      {imageUrl && !loading && !generating && (
        <div className="rounded-lg overflow-auto"
          style={{ minHeight: 300, maxHeight: '80vh', border: '1px solid var(--border)' }}>
          <img src={imageUrl} alt="Architecture diagram" draggable={false}
            style={{ display: 'block', width: `${zoom}%`, minWidth: `${zoom}%`, height: 'auto' }} />
        </div>
      )}
    </div>
  );
}
