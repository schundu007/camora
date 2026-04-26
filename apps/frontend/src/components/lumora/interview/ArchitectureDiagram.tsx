import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDiagramCache, setDiagramCache } from '@/hooks/useDiagramCache';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

function getCacheKey(question: string, provider: string, detail: string, dir: string) {
  return `${question}::${provider}::${dir}::${detail}`;
}

interface ArchitectureDiagramProps {
  question: string;
  className?: string;
}

export function ArchitectureDiagram({ question, className = '' }: ArchitectureDiagramProps) {
  const { token } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mermaidCode, setMermaidCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noCache, setNoCache] = useState(false);
  const [detailLevel, setDetailLevel] = useState<'overview' | 'detailed'>('overview');
  const [cloudProvider, setCloudProvider] = useState<string>('auto');
  const [direction, setDirection] = useState<'LR' | 'TB'>('TB');

  // Pan & zoom
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(Math.max(0.3, prev + (e.deltaY > 0 ? -0.1 : 0.1)), 4));
  }, []);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  }, [translate]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({ x: translateStart.current.x + (e.clientX - dragStart.current.x), y: translateStart.current.y + (e.clientY - dragStart.current.y) });
  }, [isDragging]);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const resetView = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }); }, []);

  // Step 1: Cache-only lookup (fast, no generation)
  useEffect(() => {
    if (!question || !token) return;
    const key = getCacheKey(question, cloudProvider, detailLevel, direction);

    // Check in-memory cache
    const mem = getDiagramCache(key);
    if (mem) {
      setImageUrl(mem.data);
      setLoading(false);
      setNoCache(false);
      setError(null);
      resetView();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNoCache(false);

    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/diagram/lookup`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ question, cloudProvider, detailLevel, direction }),
        });
        const data = await r.json();
        if (!cancelled) {
          if (data.success && data.image_url) {
            const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
            setImageUrl(url);
            setMermaidCode(null);
            setDiagramCache(key, { type: 'png', data: url, timestamp: Date.now() });
            resetView();
          } else if (data.success && data.type === 'mermaid' && data.mermaid_code) {
            // Python service was down at cache time — surface the cached Mermaid
            // as readable source (not rendered, per 'No Mermaid Diagrams' rule)
            setImageUrl(null);
            setMermaidCode(data.mermaid_code);
            resetView();
          } else {
            setNoCache(true);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setNoCache(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [question, token, detailLevel, cloudProvider, direction, resetView]);

  // Step 2: Explicit generation (only when user clicks Generate)
  const handleGenerate = async () => {
    if (!question || !token || generating) return;
    setGenerating(true);
    setError(null);
    setNoCache(false);

    try {
      const r = await fetch(`${API_URL}/api/diagram/generate`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question, cloudProvider, detailLevel, direction }),
      });
      const data = await r.json();
      if (data.success && data.image_url) {
        const url = data.image_url.startsWith('/') ? `${API_URL}${data.image_url}` : data.image_url;
        setImageUrl(url);
        setMermaidCode(null);
        const key = getCacheKey(question, cloudProvider, detailLevel, direction);
        setDiagramCache(key, { type: 'png', data: url, timestamp: Date.now() });
        resetView();
      } else if (data.success && data.type === 'mermaid' && data.mermaid_code) {
        setImageUrl(null);
        setMermaidCode(data.mermaid_code);
        resetView();
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
    setGenerating(false);
  };

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <select value={cloudProvider} onChange={(e) => setCloudProvider(e.target.value)}
            className="text-xs font-mono bg-transparent border border-[var(--border)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">
            <option value="auto">Auto</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
          </select>
          <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
            {(['LR', 'TB'] as const).map(d => (
              <button key={d} onClick={() => setDirection(d)}
                className={`px-1.5 py-0.5 text-xs font-mono transition-colors ${d !== 'LR' ? 'border-l border-[var(--border)]' : ''} ${
                  direction === d ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--accent)]'
                }`}>{d}</button>
            ))}
          </div>
          <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
            {(['overview', 'detailed'] as const).map(d => (
              <button key={d} onClick={() => setDetailLevel(d)}
                className={`px-2 py-0.5 text-xs font-mono capitalize transition-colors ${d !== 'overview' ? 'border-l border-[var(--border)]' : ''} ${
                  detailLevel === d ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--accent)]'
                }`}>{d}</button>
            ))}
          </div>
        </div>
        {imageUrl && !loading && (
          <div className="flex items-center gap-1">
            <button onClick={() => setScale(s => Math.min(s + 0.25, 4))} className="px-1.5 py-0.5 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">+</button>
            <span className="text-xs font-mono text-gray-400 min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.max(s - 0.25, 0.3))} className="px-1.5 py-0.5 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">-</button>
            <button onClick={resetView} className="px-1.5 py-0.5 text-xs font-mono border border-[var(--border)] rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] ml-1">Fit</button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center p-8 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[rgba(38,97,156,0.3)] border-t-[var(--accent)] rounded-full animate-spin" />
            <span className="text-sm text-[var(--text-muted)] font-mono">Looking up cached diagram...</span>
          </div>
        </div>
      )}

      {/* No cached diagram — show generate button */}
      {noCache && !loading && !generating && (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg text-center" style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
          <button onClick={handleGenerate}
            className="px-5 py-2.5 text-sm font-bold text-white rounded-lg transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 12px rgba(38,97,156,0.3)' }}>
            Generate Architecture Diagram
          </button>
        </div>
      )}

      {/* Generating */}
      {generating && (
        <div className="flex items-center justify-center p-8 border border-[rgba(38,97,156,0.2)] rounded-lg bg-[rgba(38,97,156,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[rgba(38,97,156,0.3)] border-t-[var(--accent)] rounded-full animate-spin" />
            <span className="text-sm text-[var(--accent)] font-mono">Generating {cloudProvider === 'auto' ? '' : cloudProvider.toUpperCase()} diagram...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && !generating && (
        <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
          <p className="text-sm text-amber-700 mb-2">{error}</p>
          <button onClick={handleGenerate}
            className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Image */}
      {imageUrl && !loading && !generating && (
        <div ref={containerRef}
          className="rounded-lg select-none flex items-center justify-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', overflow: 'hidden', minHeight: '600px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <img src={imageUrl} alt={`Architecture: ${question.slice(0, 50)}`} draggable={false}
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              maxWidth: 'none',
              height: 'auto',
            }} />
        </div>
      )}

      {/* Mermaid fallback — cached when Python was down. Rendered as source (not
          as a rendered diagram, per the 'No Mermaid Diagrams' rule) so the
          candidate still has a text architecture to talk through. */}
      {mermaidCode && !imageUrl && !loading && !generating && (
        <div className="rounded-lg p-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2 mb-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#C9A227' }}>Text architecture (diagram service unavailable)</span>
            <button onClick={handleGenerate}
              className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded hover:bg-amber-100"
              style={{ color: '#C9A227', border: '1px solid #FCD34D' }}>
              Retry diagram
            </button>
          </div>
          <pre className="text-[11px] leading-[1.5] overflow-auto p-2 rounded font-mono whitespace-pre"
            style={{ background: '#F8FAFC', border: '1px solid var(--border)', color: '#334155', maxHeight: '600px' }}>
            {mermaidCode}
          </pre>
        </div>
      )}
    </div>
  );
}
